import React from 'react';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/ext-language_tools';

function Editor({ handleEditorChange }) {
  return (
    <AceEditor
      mode="javascript"
      theme="twilight"
      name="editor"
      width="100%"
      height="100%"
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
