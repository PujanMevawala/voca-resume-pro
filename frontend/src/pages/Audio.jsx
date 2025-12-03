import React, { useState, useEffect } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import Card from '../components/Card';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';

export default function Audio({ token }) {
  const [text, setText] = useState('Hello, welcome to VocaResume Pro!');
  const [audioUrl, setAudioUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const speak = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/audio/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('TTS failed');
      
      const data = await response.json();
      
      // Check if we should use browser TTS
      if (data.useBrowserTTS) {
        toast.info('Using browser Text-to-Speech');
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
          toast.success('Speaking...');
        } else {
          toast.error('Browser TTS not supported');
        }
        return;
      }
      
      // Cloud TTS returned audio blob
      const blob = await response.blob();
      setAudioUrl(URL.createObjectURL(blob));
      toast.success('Audio generated!');
    } catch (e) {
      toast.error(e.message || 'TTS failed');
    }
  };

  const startRec = async () => {
    try {
      // Try browser Web Speech API first (Chrome/Edge)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';
        
        recog.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          toast.success(`Transcription: ${transcript}`);
          setRecording(false);
        };
        
        recog.onerror = (event) => {
          toast.error(`Speech recognition error: ${event.error}`);
          setRecording(false);
        };
        
        recog.onend = () => setRecording(false);
        
        recog.start();
        setRecognition(recog);
        setRecording(true);
        toast.info('Listening... (Browser Speech Recognition)');
        return;
      }
      
      // Fallback to recording + backend STT
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const recordedChunks = [];
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };
      
      mr.onstop = async () => {
        try {
          const blob = new Blob(recordedChunks, { type: 'audio/webm' });
          const fd = new FormData();
          fd.append('file', blob, 'audio.webm');
          
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/audio/stt`, {
            method: 'POST',
            body: fd,
          });
          
          const data = await response.json();
          
          if (data.useBrowserSTT) {
            toast.warning('Backend STT unavailable. Please use browser speech recognition (click Start Recording again).');
          } else if (data.text) {
            toast.success(`Transcription: ${data.text}`);
          } else {
            toast.error('Transcription failed');
          }
        } catch (e) {
          toast.error(e.message || 'STT failed');
        }
      };
      
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
      toast.info('Recording...');
    } catch (e) {
      toast.error(e.message || 'Microphone access denied');
    }
  };

  const stopRec = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
  };

  return (
    <div className="app-background">
      <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
      <AnimatedPage>
        <div className="max-w-3xl mx-auto pt-14 grid gap-4">
        <Card>
          <h2 className="text-xl font-semibold">Text to Speech</h2>
          <textarea
            rows={3}
            className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-3 outline-none focus:ring-2 focus:ring-brand-400"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={speak}>Speak</Button>
            {audioUrl && <audio controls src={audioUrl} className="w-full" />}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Speech to Text</h2>
          <div className="mt-3">
            <Button onClick={recording ? stopRec : startRec} variant={recording ? 'secondary' : 'primary'}>
              {recording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Your recording is transcribed via the backend when you stop.</p>
        </Card>
      </div>
      </AnimatedPage>
    </div>
  );
}
