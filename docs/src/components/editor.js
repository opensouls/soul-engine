import React from "react";

const isBrowser = typeof window !== "undefined";

function Editor({ editorCode, handleEditorChange }) {
  if (!isBrowser) {
    return null;
  }
  const AceEditor = require("react-ace").default;

  require("ace-builds/src-noconflict/mode-javascript");
  require("ace-builds/src-noconflict/theme-twilight");
  require("ace-builds/src-noconflict/ext-language_tools");

  return (
    <AceEditor
      mode="javascript"
      theme="twilight"
      name="editor"
      width="100%"
      height="100%"
      value={editorCode}
      onChange={handleEditorChange}
      setOptions={{
        useWorker: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
}

export default Editor;
