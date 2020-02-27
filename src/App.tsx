import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { run } from "./interpreter/run";

function App() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("./source.idg")
      .then(data => data.text())
      .then(source => {
        if (ref.current == null) throw new Error("missing ref");
        run(source, ref.current);
      });
  }, []);

  return <div ref={ref} className="App"></div>;
}

export default App;
