import * as Uebersicht from "uebersicht";
import * as Settings from "../settings";
import { useSimpleBarContext } from "../components/simple-bar-context.jsx";

const { React } = Uebersicht;

export default function useServerSocket(
  target,
  visible,
  getter,
  resetWidget,
  userWidgetIndex
) {
  const { settings, setSettings } = useSimpleBarContext();
  const { enableServer, serverSocketPort } = settings.global;
  const socket = React.useRef(null);

  React.useEffect(() => {
    const isUserWidget = target === "user-widget";
    if (enableServer && socket.current === null) {
      let queryParams = `target=${target}`;

      if (userWidgetIndex !== undefined) {
        queryParams = queryParams.concat(`&userWidgetIndex=${userWidgetIndex}`);
      }

      const newSocket = new WebSocket(
        `ws://localhost:${serverSocketPort}/?${queryParams}`
      );

      newSocket.onmessage = (e) => {
        const { action } = JSON.parse(e.data);

        if (visible && action === "refresh") {
          getter();
        }
        if (action === "toggle") {
          if (isUserWidget) {
            toggleUserWidget(userWidgetIndex, resetWidget, setSettings);
          } else {
            toggleWidget(target, resetWidget, setSettings);
          }
        }
      };

      socket.current = newSocket;
    }
  }, [
    enableServer,
    getter,
    resetWidget,
    serverSocketPort,
    settings,
    setSettings,
    socket,
    target,
    visible,
    userWidgetIndex,
  ]);
}

const settingsKeys = {
  battery: "batteryWidget",
  "browser-track": "browserTrackWidget",
  cpu: "cpuWidget",
  crypto: "cryptoWidget",
  "date-display": "dateWidget",
  keyboard: "keyboardWidget",
  mic: "micWidget",
  mpd: "mpdWidget",
  music: "musicWidget",
  netstats: "netstatsWidget",
  sound: "soundWidget",
  spotify: "spotifyWidget",
  stock: "stockWidget",
  time: "timeWidget",
  "viscosity-vpn": "vpnWidget",
  weather: "weatherWidget",
  wifi: "wifiWidget",
  zoom: "zoomWidget",
};

async function toggleWidget(widget, resetWidget, setSettings) {
  const key = settingsKeys[widget];
  setSettings((settings) => {
    const { widgets } = settings;
    const active = !widgets[key];
    if (!active) {
      resetWidget?.();
    }
    const newSettings = {
      ...settings,
      widgets: { ...widgets, [key]: active },
    };
    Settings.set(newSettings);
    return newSettings;
  });
}

async function toggleUserWidget(index, resetWidget, setSettings) {
  setSettings((settings) => {
    const { userWidgetsList = {} } = settings.userWidgets;
    const active = !userWidgetsList[index].active;
    if (!active) {
      resetWidget?.();
    }
    const newUserWidgetsList = {
      ...userWidgetsList,
      [index]: { ...userWidgetsList[index], active },
    };

    const newSettings = {
      ...settings,
      userWidgets: {
        ...settings.userWidgets,
        userWidgetsList: newUserWidgetsList,
      },
    };
    Settings.set(newSettings);
    return newSettings;
  });
}
