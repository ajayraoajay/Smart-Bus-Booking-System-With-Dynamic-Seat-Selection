import { useEffect } from "react";

/*Build a React component that fetches and  data from an api endpoint and displays in UI. 
Add success and error*/  
function user(){
    const[users,setusers]=useState({});
    const[error,setError]=useState({});
    const[loading,setLoading]=useState(true);
    useEffect(()=>{
        fetch(" ")
        .then(res=>res.json())
        .then(data=>{
            setusers(data);
            setLoading(false);
    });
    .catch(error=>{
        set
    })
},[]);

    }
}