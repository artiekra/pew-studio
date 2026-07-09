import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { Compartment } from "@codemirror/state";
import { basicDark } from "@fsegurai/codemirror-theme-basic-dark";
import { basicLight } from "@fsegurai/codemirror-theme-basic-light";
import {
  amy,
  ayuLight,
  barf,
  bespin,
  birdsOfParadise,
  boysAndGirls,
  clouds,
  cobalt,
  coolGlow,
  dracula,
  espresso,
  noctisLilac,
  rosePineDawn,
  smoothy,
  solarizedLight,
  tomorrow,
} from "thememirror";
import { json } from "@codemirror/lang-json";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";

const themes = {
  light: basicLight,
  dark: basicDark,
  amy,
  ayuLight,
  barf,
  bespin,
  birdsOfParadise,
  boysAndGirls,
  clouds,
  cobalt,
  coolGlow,
  dracula,
  espresso,
  noctisLilac,
  rosePineDawn,
  smoothy,
  solarizedLight,
  tomorrow,
};

/** mounts the codemirror editor to the dom element. */
function initializeEditor() {
  const editorContainer = document.getElementById("editor");

  if (editorContainer) {
    const themeCompartment = new Compartment();
    const languageCompartment = new Compartment();

    const view = new EditorView({
      doc: "",
      extensions: [
        basicSetup,
        themeCompartment.of(basicDark),
        languageCompartment.of([]),
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

    window.setTheme = (theme) => {
      view.dispatch({
        effects: themeCompartment.reconfigure(themes[theme] || basicDark),
      });
    };

    window.setLanguage = (lang) => {
      let ext = [];
      if (lang === "json") ext = json();
      else if (lang === "lua") ext = StreamLanguage.define(lua);

      view.dispatch({
        effects: languageCompartment.reconfigure(ext),
      });
    };
  }
}

initializeEditor();
