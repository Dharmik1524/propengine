import { useEffect, useState} from 'react';

export default function DisplayPropertiesPage(){
   
    const[data, setData]= useState([]);
    const[input, setInput] = useState('');
    const[loading, setLoading] = useState(true);
    const[error,setError] = useState(null);

    useEffect(()=>{
     const run= async() =>{
    try{
        const res = await fetch("http://localhost:5000/api/properties");
        if(!res.ok) throw new Error ("Network error");
        const json = await res.json();
        setData(json);
    }
    catch(e){
        setError(e.message);

    }
    finally{
     setLoading(false);
    }
     };
     run();
    },[]);

    const searchQuery = async() => {
      try{
     setLoading(true);
     const res = await fetch("http:/localhost:5000/api/properties",{
      method: "POST",
      headers:{
        "Content-Type": "application/json"
      },
      body: JSON.stringify({searchText: input})
     });
     if(!res.ok) throw new Error("Network error");
     const json = await res.json();
     setData(json);
      }
      catch(e){
        setError(e.message);
      }
      finally{
       setLoading(false);
      }
    };

  if (loading) return <p className="p-4">Loading…</p>;
  if (error)   return <p className="p-4 text-red-600">Error: {error}</p>;

  return(

     <>
      <div className='flex gap-2 mt-5'>
        <input
        type="text" 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className='flex-1 border border-gray-500 rounded-full px-4 py-2'
        />
        <button 
        className='rounded-full bg-black text-amber-50 text-medium px-4 py-2 disabled:bg-gray-500'
        onClick={searchQuery}
        disabled={input.trim().length < 10}>Search</button>
      </div>
     <div className='space-y-4 mt-10'>
      {data.map((row) => (
        <div key={row.id} className="border border-gray-300 shadow-blue-500 rounded p-4">
          <h3 className="font-semibold">{row.title}</h3>
          <p className="text-sm text-gray-600">{row.location}</p>
          <p className="mt-2 font-bold">${row.price}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(row.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
    </>

  );

};