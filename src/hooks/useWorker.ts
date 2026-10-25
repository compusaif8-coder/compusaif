import { useEffect, useRef, useCallback } from "react";

type WorkerMessage = {
  type: string;
  data: any;
};

export function useWorker(workerPath: string) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL(workerPath, import.meta.url), {
      type: "module",
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerPath]);

  const postMessage = useCallback((message: WorkerMessage) => {
    if (workerRef.current) {
      workerRef.current.postMessage(message);
    }
  }, []);

  const addEventListener = useCallback(
    (callback: (event: MessageEvent) => void) => {
      if (workerRef.current) {
        workerRef.current.addEventListener("message", callback);
      }
    },
    []
  );

  const removeEventListener = useCallback(
    (callback: (event: MessageEvent) => void) => {
      if (workerRef.current) {
        workerRef.current.removeEventListener("message", callback);
      }
    },
    []
  );

  return {
    postMessage,
    addEventListener,
    removeEventListener,
  };
}
