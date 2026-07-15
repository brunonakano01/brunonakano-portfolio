// Stub trpc client — WebcamChatContent uses this for chat mutation
// In the static build, the chat feature is disabled gracefully
export const trpc = {
  chat: {
    send: {
      useMutation: () => ({
        mutate: (_data: any) => {},
        isLoading: false,
        error: null,
      }),
    },
  },
} as any;
