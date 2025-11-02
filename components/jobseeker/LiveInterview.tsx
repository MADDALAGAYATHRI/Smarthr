import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
// FIX: The 'LiveSession' type is not exported from '@google/genai'. Removing it from the import.
import { Modality, LiveServerMessage, Blob as GenAI_Blob } from '@google/genai';
import type { Job, Candidate, Application } from '../../types';

// FIX: To resolve the missing 'LiveSession' type, a local interface is defined with only the methods used in this component.
interface LiveSession {
  sendRealtimeInput(input: { media: GenAI_Blob }): void;
  close(): void;
}

// --- AUDIO HELPER FUNCTIONS ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenAI_Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- COMPONENT ---
interface LiveInterviewProps {
    application: Application & { job: Job; candidate: Candidate };
    onClose: () => void;
}

type InterviewStatus = 'Idle' | 'RequestingPermissions' | 'Ready' | 'Connecting' | 'InProgress' | 'Stopping' | 'Complete' | 'Error';

const LiveInterview = ({ application, onClose }: LiveInterviewProps) => {
    const { ai, saveVideoInterview } = useSmartHire();
    const [status, setStatus] = useState<InterviewStatus>('Idle');
    const [error, setError] = useState<string | null>(null);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const fullTranscriptRef = useRef<string>('');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = useCallback(() => {
        // Stop media stream tracks
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        // Disconnect audio processing
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        // Close audio contexts
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;

        // Clear audio sources
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();
        
        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
    }, []);

    useEffect(() => {
        const setupMedia = async () => {
            try {
                setStatus('RequestingPermissions');
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setStatus('Ready');
            } catch (err) {
                console.error("Error accessing media devices:", err);
                setError("Camera and microphone access is required for the interview. Please check your browser permissions.");
                setStatus('Error');
            }
        };
        setupMedia();
        return cleanup;
    }, [cleanup]);
    
    const startInterview = async () => {
        if (!ai || !mediaStreamRef.current) {
            setError("Could not start interview. AI or media stream not ready.");
            setStatus('Error');
            return;
        }
        
        setStatus('Connecting');
        setError(null);
        fullTranscriptRef.current = '';
        recordedChunksRef.current = [];
        
        try {
            // Setup MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };
            mediaRecorderRef.current.onstop = () => {
                const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(videoBlob);
                saveVideoInterview(application.id, videoUrl, fullTranscriptRef.current);
                setStatus('Complete');
            };
            
            // Setup Gemini Live
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            
            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!mediaStreamRef.current || !inputAudioContextRef.current) return;
                        mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (event) => {
                            const inputData = event.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                        
                        mediaRecorderRef.current?.start();
                        setStatus('InProgress');
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => { outputSourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.outputTranscription) {
                            setIsAiSpeaking(true);
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        } else if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            setIsAiSpeaking(false);
                            fullTranscriptRef.current += `AI: ${currentOutputTranscription.trim()}\n`;
                            fullTranscriptRef.current += `Candidate: ${currentInputTranscription.trim()}\n`;
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        setError("An error occurred during the interview. Please try again.");
                        setStatus('Error');
                    },
                    onclose: () => {
                       // Session closed by server or user
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: `You are a professional and friendly AI interviewer for a platform called SmartHire. Your goal is to conduct a structured behavioral interview for the position of ${application.job.title}. Ask one question at a time, wait for the candidate's response, and then ask a relevant follow-up or a new question from a standard list of behavioral questions (like STAR method questions). Keep your questions concise. Start by introducing yourself briefly, explaining the process, and then ask your first question. End the interview after about 5-7 questions by thanking the candidate for their time.`
                }
            });
        } catch (err) {
             console.error("Failed to start interview:", err);
             setError(err instanceof Error ? err.message : "An unknown error occurred.");
             setStatus('Error');
        }
    };
    
    const stopInterview = () => {
        setStatus('Stopping');
        mediaRecorderRef.current?.stop();
        cleanup();
    };

    const getInterviewPrompt = () => {
        switch (status) {
            case 'InProgress':
                return isAiSpeaking ? 'AI is speaking...' : 'Your turn to speak.';
            case 'Connecting':
                return 'Connecting...';
            case 'Ready':
                return 'The interview will begin when you are ready.';
            default:
                return 'Preparing interview environment...';
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'Complete':
                return (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-slate-900">Interview Complete!</h3>
                        <p className="text-slate-600 my-4">Your interview has been recorded and submitted to the hiring team. The AI is now analyzing your responses. You can close this window.</p>
                        <button onClick={onClose} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark">Close</button>
                    </div>
                );
            case 'Error':
                return (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-red-600">An Error Occurred</h3>
                        <p className="text-slate-600 my-4">{error}</p>
                        <button onClick={onClose} className="bg-slate-200 text-slate-800 font-bold py-2 px-6 rounded-lg hover:bg-slate-300">Close</button>
                    </div>
                );
            default:
                return (
                    <div className="text-center">
                         <h3 className="text-2xl font-bold text-slate-900">AI Video Interview</h3>
                         <p className="text-slate-600 mb-4">For the position of <span className="font-semibold">{application.job.title}</span></p>
                         <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4 border-4 border-slate-200 shadow-lg">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                            {status === 'InProgress' && <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse"><div className="w-2.5 h-2.5 bg-white rounded-full"></div><span>REC</span></div>}
                         </div>
                         <div className="h-20 bg-slate-100 rounded-lg p-3 text-lg text-slate-700 overflow-y-auto mb-4 flex items-center justify-center">
                            <p className={`transition-opacity ${isAiSpeaking ? 'text-primary font-semibold' : 'text-slate-500 italic'}`}>
                                {getInterviewPrompt()}
                            </p>
                         </div>
                        {status === 'Ready' && (
                            <div className="space-y-4 max-w-sm mx-auto">
                                <button onClick={startInterview} className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-primary-dark w-full">Begin Interview</button>
                            </div>
                        )}
                         {status === 'Connecting' && <p className="font-semibold text-slate-700">Connecting to AI Interviewer...</p>}
                         {status === 'InProgress' && <button onClick={stopInterview} className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700">Finish Interview</button>}
                         {(status === 'Stopping' || status === 'RequestingPermissions') && <p className="font-semibold text-slate-700">Please wait...</p>}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[100] p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl">
                 {renderContent()}
            </div>
        </div>
    );
};

export default LiveInterview;
