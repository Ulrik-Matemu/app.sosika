// speech.d.ts or at the top of your component file
declare global {
    interface Window {
      webkitSpeechRecognition: any;
      SpeechRecognition: any;
    }
  
    var webkitSpeechRecognition: any;
    var SpeechRecognition: any;
  }
  

import { useEffect, useRef } from "react";

export const useWakeWordListener = (wakeWord: string, onWake: () => void) => {
    const SpeechRecognitionClass =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  
  const recognizerRef = useRef<InstanceType<typeof SpeechRecognitionClass> | null>(null);
  


  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      console.warn("SpeechRecognition API not supported.");
      return;
    }

    const recognizer = new Recognition();
    recognizerRef.current = recognizer;

    recognizer.continuous = true;
    recognizer.lang = "en-US";
    recognizer.interimResults = false;

    recognizer.onresult = (event: any) => {
      const transcript = event.results[event.resultIndex][0].transcript.toLowerCase();
      console.log("Heard:", transcript);

      if (transcript.includes(wakeWord.toLowerCase())) {
        onWake();
      }
    };

    recognizer.onend = () => {
      // Restart the recognizer for continuous listening
      recognizer.start();
    };

    recognizer.onerror = (err: any) => {
      console.warn("Wake word listener error:", err);
    };

    recognizer.start();

    return () => {
      recognizer.stop();
      recognizerRef.current = null;
    };
  }, [wakeWord, onWake]);
};
