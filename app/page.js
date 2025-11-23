export default function Home() {
  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,fontFamily:'ui-sans-serif, system-ui'}}>
      <h1 style={{fontSize:28, margin:0}}>Agentic Shorts Pipeline</h1>
      <p style={{opacity:0.8, margin:0}}>Deployed successfully ? Health at /api/health</p>
    </main>
  );
}
