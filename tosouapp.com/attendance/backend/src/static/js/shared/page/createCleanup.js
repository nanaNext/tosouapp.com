function e(){const n=[];return{add(t){typeof t=="function"&&n.push(t)},run(){for(const t of n.splice(0))try{t()}catch{}}}}export{e as createCleanup};
