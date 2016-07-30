'use babel';

import InteratomView from './interatom-view';

import { BufferedProcess, CompositeDisposable, AtomEnvironment } from 'atom';

import packageConfig from './config-schema.json';

import Elm from "./do-stuff.js"

// TODO basic package-setup here: https://www.sitepoint.com/write-atom-packages-using-vanilla-javascript/
export default {

  receiver: null,

  element: null,
  intero: null,
  app: null,
  interatomView: null,
  modalPanel: null,
  config: packageConfig,
  subscriptions: null,

  activate(state) {

    atom.commands.add('atom-text-editor',
    'interatom:type-at', (event) => {
      var editor = atom.workspace.getActiveTextEditor()
      let pos = editor.getCursorBufferPosition();
      let p1 = (pos.row + 1) + " " + (pos.column + 1);

      this.interoCommand(":type-at " + editor.getPath() + " " + p1 + " " + p1 + "\n", out => this.doWithResult(out));
    });

    // TODO
    // block decoration (Elm controlled)
    this.element = document.createElement('div');

    // TODO: nanomsg

    // Intero child-process
    const out = (output) => {
      console.log("Received from intero: " + output);
      if (this.receiver != null) {
        this.receiver(output);
        this.receiver = null;
      }
    }
    const exit = (code) => {
      console.log("intero exited with code: " + code);
    }

    // TODO find dirs / relative dirs...
    this.intero = new BufferedProcess({
      command: "stack",
      args: ["ghci", "--with-ghc", "/Users/jwin/.local/bin/intero", "--ghci-options", "-ghci-script=/Users/jwin/.atom/dev/packages/interatom/.ghci-intero"],
      options: {cwd: "/Users/jwin/ghc8-playground/",
                stdio: ['pipe', 'pipe', 'pipe']},
      stdout: out,
      exit: exit
    }).process;

    // this.intero.stdin.write(":set prompt \"## \"\n");
    console.log("started intero");

    // TODO Elm
    this.app = Elm.DoStuff.embed(this.element);
    // this.app = Elm.DoStuff.worker();
    this.app.ports.result.subscribe(
      function(data) {
        console.log(data)
      }
    );
    // TODO
    setTimeout(() => this.app.ports.check.send("SEND 1"), 5000);

    // TODO initialize block-decorator elsewhere, if at all...
    var editor = atom.workspace.getActiveTextEditor()
    var marker = editor.markScreenPosition([0, 0])
    editor.decorateMarker(marker, {type: 'block', position: 'before', item: this.element})

    this.interatomView = new InteratomView(state.interatomViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.interatomView.getElement(),
      visible: false,
      className: 'interatom'
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.workspace.observeTextEditors(editor => {

        editorView = atom.views.getView(editor);
        editorView.addEventListener('keydown', (event) => {
          if (this.modalPanel.isVisible()) {
            this.modalPanel.hide();
          }
        });

        const savedSubscription = editor.onDidSave(event => console.log('TODO onDidSave'));
        this.subscriptions.add(savedSubscription);
        this.subscriptions.add(editor.onDidDestroy(() => savedSubscription.dispose()));
      }));

    this.subscriptions.add(this.subscribeToConfigChanges());
  },

  deactivate() {
    // TODO ?
    // this.intero.stdin.write(":quit\n");
    this.intero.exit(0);

    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.interatomView.destroy();
  },

  serialize() {
    return {
      interatomViewState: this.interatomView.serialize()
    };
  },

  subscribeToConfigChanges() {
    const subscriptions = new CompositeDisposable();

    const interoConfigObserver = atom.config.observe(
      'interatom.interoConfig',
      (value) => {
        console.log('Detected a config change: ' + value);
        // TODO
      });
    subscriptions.add(interoConfigObserver);

    return subscriptions;
  },

  interoCommand(cmd, fn) {
    if (this.intero != null) {
      this.receiver = fn;
      this.intero.stdin.write(cmd);
    }
  },

  // TODO show as block-decorator, in console-window, tooltip... ?
  // console.log(this.intero.stdout.bytesRead);
  doWithResult(result) {

    // TODO anything in Elm ?
    this.app.ports.render.send("via Elm.. ");

    this.interatomView.setMessage(result);
    this.modalPanel.hide(); // Hide existing one, if any.
    // setTimeout(() => {
    //   this.interatomView.fadeOut();
    //   setTimeout(() => this.modalPanel.hide(), 5000);
    // }, 1000);
    this.modalPanel.show();
  }

};
