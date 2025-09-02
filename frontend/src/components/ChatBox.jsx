import { useState, useEffect, useRef } from "react";

export default function ChatBox({ endpoint }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const reply =
        data?.lead || data?.listing
          ? "✅ Successfully submitted!"
          : data.followUp || "Something went wrong.";

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error: " + err.message },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    
      <div className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-[80vh] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col mx-auto">
        <header className="bg-purple-900 text-white text-xl  font-semibold px-6 py-4 rounded-t-xl shadow flex flex-col items-center">
          PropEngine Assistant
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-xs w-fit rounded-xl bg-gray-50 p-4 shadow">
                <div className="text-sm font-semibold text-gray-700 mb-1">
                  {msg.role === "user" ? "You" : "PropEngine"}
                </div>
                <p className="text-gray-600 whitespace-pre-line text-sm">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="px-6 py-4 border-t flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
          className="bg-purple-900  hover:bg-purple-700 text-white text-xs sm:text-sm md:text-base font-medium px-5 py-2 rounded-full"
            onClick={sendMessage}
            disabled={loading}
            
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    
  );
}
