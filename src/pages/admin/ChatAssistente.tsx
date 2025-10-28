import ChatAssistente from "@/components/ChatAssistente";

const ChatAssistentePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Chat com L&J</h1>
        <p className="text-muted-foreground">
          Assistente virtual do Studio Jennifer Silva
        </p>
      </div>

      <ChatAssistente />
    </div>
  );
};

export default ChatAssistentePage;