function o({mount:e}){let t=()=>{};return{async mount(u){t();const n=await e(u);t=typeof n=="function"?n:()=>{}},unmount(){t(),t=()=>{}}}}export{o as createPage};
