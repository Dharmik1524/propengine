import ChatBox from "../components/ChatBox";

export default function FindPropertyPage() {
  return (
    <div className="p-5">
       
      <h1 className="text-center text-xl font-semibold mb-2">Find Property</h1>
      <ChatBox endpoint="http://localhost:5000/api/leads" />
    </div>
  );
}
