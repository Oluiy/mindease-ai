import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useChat() {
  const sendMessage = useMutation({
    mutationFn: async (message) => {
      const res = await api.post("/chat", { message });
      return res.data;
    },
  });

  return { sendMessage };
}
