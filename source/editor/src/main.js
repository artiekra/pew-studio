import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";

/** mounts the codemirror editor to the dom element. */
function initializeEditor() {
  // grab our container
  const editorContainer = document.getElementById("editor");

  if (editorContainer) {
    new EditorView({
      doc: 'console.log("hello from react native!");',
      extensions: [basicSetup],
      parent: editorContainer,
    });
  }
}

initializeEditor();
