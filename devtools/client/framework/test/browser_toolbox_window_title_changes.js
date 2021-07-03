/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

requestLongerTimeout(5);

var { Toolbox } = require("devtools/client/framework/toolbox");

function test() {
  const URL_1 = "data:text/plain;charset=UTF-8,abcde";
  const URL_2 = "data:text/plain;charset=UTF-8,12345";
  const URL_3 = URL_ROOT + "browser_toolbox_window_title_changes_page.html";

  const TOOL_ID_1 = "webconsole";
  const TOOL_ID_2 = "jsdebugger";

  const NAME_1 = "";
  const NAME_2 = "";
  const NAME_3 = "Toolbox test for title update";

  let toolbox;
  let panel;

  addTab(URL_1).then(async function() {
    const tab = gBrowser.selectedTab;
    gDevTools
      .showToolboxForTab(tab, { hostType: Toolbox.HostType.BOTTOM })
      .then(function(aToolbox) {
        toolbox = aToolbox;
      })
      .then(() => toolbox.selectTool(TOOL_ID_1))

      // undock toolbox and check title
      .then(() => {
        // We have to first switch the host in order to spawn the new top level window
        // on which we are going to listen from title change event
        return toolbox
          .switchHost(Toolbox.HostType.WINDOW)
          .then(() => waitForTitleChange(toolbox));
      })
      .then(checkTitle.bind(null, NAME_1, URL_1, "toolbox undocked"))

      // switch to different tool and check title
      .then(async () => {
        const onTitleChanged = waitForTitleChange(toolbox);
        panel = await toolbox.selectTool(TOOL_ID_2);
        return onTitleChanged;
      })
      .then(checkTitle.bind(null, NAME_1, URL_1, "tool changed"))

      // navigate to different local url and check title
      .then(async function() {
        const onTitleChanged = waitForTitleChange(toolbox);
        const waitForReloaded = panel.once("reloaded");
        await navigateTo(URL_2);
        await waitForReloaded;
        return onTitleChanged;
      })
      .then(checkTitle.bind(null, NAME_2, URL_2, "url changed"))

      // navigate to a real url and check title
      .then(async () => {
        const onTitleChanged = waitForTitleChange(toolbox);
        const waitForReloaded = panel.once("reloaded");
        await navigateTo(URL_3);
        await waitForReloaded;
        return onTitleChanged;
      })
      .then(checkTitle.bind(null, NAME_3, URL_3, "url changed"))

      // destroy toolbox, create new one hosted in a window (with a
      // different tool id), and check title
      .then(function() {
        // Give the tools a chance to handle the navigation event before
        // destroying the toolbox.
        executeSoon(function() {
          toolbox
            .destroy()
            .then(async function() {
              // After destroying the toolbox, open a new one.
              return gDevTools.showToolboxForTab(tab, {
                hostType: Toolbox.HostType.WINDOW,
              });
            })
            .then(function(aToolbox) {
              toolbox = aToolbox;
            })
            .then(() => {
              const onTitleChanged = waitForTitleChange(toolbox);
              toolbox.selectTool(TOOL_ID_1);
              return onTitleChanged;
            })
            .then(
              checkTitle.bind(
                null,
                NAME_3,
                URL_3,
                "toolbox destroyed and recreated"
              )
            )

            // clean up
            .then(() => toolbox.destroy())
            .then(function() {
              toolbox = null;
              gBrowser.removeCurrentTab();
              Services.prefs.clearUserPref("devtools.toolbox.host");
              Services.prefs.clearUserPref("devtools.toolbox.selectedTool");
              Services.prefs.clearUserPref("devtools.toolbox.sideEnabled");
              finish();
            });
        });
      });
  });
}

function checkTitle(name, url, context) {
  const win = Services.wm.getMostRecentWindow("devtools:toolbox");
  let expectedTitle;
  if (name) {
    expectedTitle = `Developer Tools — ${name} — ${url}`;
  } else {
    expectedTitle = `Developer Tools — ${url}`;
  }
  is(win.document.title, expectedTitle, context);
}