import ChatBox from "../components/ChatBox";

export default function FindPropertyPage() {
  return (
    <div className="p-5 max-w-2xl mx-auto">
        <div className="flex justify-center items-center">
      <h1 className="text-xl font-semibold">Find Property</h1></div>
      <ChatBox endpoint="http://localhost:5000/api/leads" />
    </div>
  );
}
