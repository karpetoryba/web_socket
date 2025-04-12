import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  messageService,
  CreateMessageDto,
} from "../../services/messageService";
import { io, Socket } from "socket.io-client";
import { SendHorizontal } from "lucide-react";

interface Message {
  text: string;
  userId: string;
  timestamp: Date;
}

const MessageForm: React.FC = () => {
  const { register, handleSubmit, reset, watch } = useForm<CreateMessageDto>();
  const queryClient = useQueryClient();
  const messageText = watch("text", "");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const allowToSend = messageText.trim() !== "";

  // on a appeler le serveur socket.io pour se connecter
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const socket = io("http://localhost:8000", {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to server");
      setSocket(socket);
    });

    socket.on("messageFromBack", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("userTyping", (userId: string) => {
      setTypingUsers((prev) => [...prev, userId]);
    });

    socket.on("userStoppedTyping", (userId: string) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    });

    // on a appeler le serveur socket.io pour se deconnecter
    return () => {
      socket.disconnect();
    };
  }, []);

  // Обработка набора текста
  useEffect(() => {
    if (!socket) return;

    const typingTimeout = setTimeout(() => {
      if (isTyping) {
        socket.emit("typing", false);
        setIsTyping(false);
      }
    }, 1000);

    if (messageText && !isTyping) {
      socket.emit("typing", true);
      setIsTyping(true);
    }

    return () => clearTimeout(typingTimeout);
  }, [messageText, socket, isTyping]);

  const mutation = useMutation({
    mutationFn: (data: CreateMessageDto) => messageService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      reset();
    },
  });

  const onSubmit = (data: CreateMessageDto) => {
    if (socket) {
      socket.emit("messageFromClient", data.text);
      socket.emit("typing", false);
      setIsTyping(false);
    }
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className="mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-600">{message.text}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-500 italic">
            {typingUsers.length === 1
              ? "Someone is typing..."
              : "Multiple people are typing..."}
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="relative p-4">
        <div className="flex gap-2">
          <input
            {...register("text", { required: true })}
            type="text"
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={mutation.isPending || !allowToSend}
            className={`absolute right-4 top-4 bottom-4 rounded-r-lg bg-indigo-500 px-4 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 cursor-pointer ${
              allowToSend ? "opacity-100" : "opacity-0"
            }`}
          >
            {mutation.isPending ? "Sending..." : <SendHorizontal />}
          </button>
        </div>
        {mutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            Error sending message. Please try again.
          </p>
        )}
      </form>
    </div>
  );
};

export default MessageForm;
