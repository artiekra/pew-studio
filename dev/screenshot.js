import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";

// 👉 CHANGE THE THEME IMPORT HERE TO PREVIEW DIFFERENT THEMES:
import { amy as theme } from "thememirror";
// import { ayuLight as theme } from "thememirror";
// import { barf as theme } from "thememirror";
// import { bespin as theme } from "thememirror";
// import { birdsOfParadise as theme } from "thememirror";
// import { boysAndGirls as theme } from "thememirror";
// import { clouds as theme } from "thememirror";
// import { cobalt as theme } from "thememirror";
// import { coolGlow as theme } from "thememirror";
// import { dracula as theme } from "thememirror";
// import { espresso as theme } from "thememirror";
// import { noctisLilac as theme } from "thememirror";
// import { rosePineDawn as theme } from "thememirror";
// import { smoothy as theme } from "thememirror";
// import { solarizedLight as theme } from "thememirror";
// import { tomorrow as theme } from "thememirror";

// For basic themes:
// import { basicLight as theme } from "@fsegurai/codemirror-theme-basic-light";
// import { basicDark as theme } from "@fsegurai/codemirror-theme-basic-dark";

const sampleCode = `
-- configure player
function configure()
  pewpew.configure_player(0,
    { shield = 2 })
end



`;

// Initialize the editor
const view = new EditorView({
  doc: sampleCode,
  extensions: [basicSetup, StreamLanguage.define(lua), theme],
  parent: document.getElementById("editor"),
});
