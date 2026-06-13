import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";

/** mounts the codemirror editor to the dom element. */
function initializeEditor() {
  const editorContainer = document.getElementById("editor");

  if (editorContainer) {
    const view = new EditorView({
      doc: "",
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "change",
                content: update.state.doc.toString(),
              })
            );
          }
        }),
      ],
      parent: editorContainer,
    });

    window.setEditorContent = (content) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      });
    };
  }
}

initializeEditor();
