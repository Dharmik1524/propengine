import ChatBox from "../components/ChatBox";

export default function ListPropertyPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">List Property</h1>
      <ChatBox endpoint="http://localhost:5000/api/listings" />
    </div>
  );
}