import * as Uebersicht from "uebersicht";
import * as DataWidget from "./data-widget.jsx";
import * as DataWidgetLoader from "./data-widget-loader.jsx";
import * as Icons from "../icons.jsx";
import useWidgetRefresh from "../../hooks/use-widget-refresh";
import useServerSocket from "../../hooks/use-server-socket";
import { useSimpleBarContext } from "../simple-bar-context.jsx";
import * as Utils from "../../utils";

export { browserTrackStyles as styles } from "../../styles/components/data/browser-track";

const { React } = Uebersicht;

const DEFAULT_REFRESH_FREQUENCY = 10000;

export const Widget = React.memo(() => {
  const { displayIndex, settings } = useSimpleBarContext();
  const { widgets, browserTrackWidgetOptions } = settings;
  const { browserTrackWidget } = widgets;
  const { refreshFrequency, showSpecter, showOnDisplay } =
    browserTrackWidgetOptions;
  const visible =
    Utils.isVisibleOnDisplay(displayIndex, showOnDisplay) && browserTrackWidget;

  const refresh = React.useMemo(
    () =>
      Utils.getRefreshFrequency(refreshFrequency, DEFAULT_REFRESH_FREQUENCY),
    [refreshFrequency]
  );

  const ref = React.useRef();

  const [state, setState] = React.useState();
  const [loading, setLoading] = React.useState(visible);

  const resetWidget = () => {
    setState(undefined);
    setLoading(false);
  };

  const getBrowserTrack = React.useCallback(async () => {
    if (!visible) return;
    const [firefoxStatus, firefoxDevStatus] = await Promise.all([
      Uebersicht.run(
        `ps aux | grep -v 'grep' | grep -q 'Firefox' && echo "true" || echo "false"`
      ),
      Uebersicht.run(
        `ps aux | grep -v 'grep' | grep -q 'Firefox Developer Edition' && echo "true" || echo "false"`
      ),
    ]);
    const isFirefoxDevRunning =
      Utils.cleanupOutput(firefoxDevStatus) === "true";
    const isFirefoxRunning = Utils.cleanupOutput(firefoxStatus) === "true";
    const scriptNamePrefix = isFirefoxDevRunning
      ? "firefox-dev"
      : isFirefoxRunning
      ? "firefox"
      : "browser";

    const [browserTrackOutput, spotifyStatus] = await Promise.all([
      Uebersicht.run(
        `osascript ./simple-bar/lib/scripts/${scriptNamePrefix}-audio.applescript 2>&1`
      ),
      Uebersicht.run(
        `ps aux | grep -v 'grep' | grep -q '[S]potify Helper' && echo "true" || echo "false"`
      ),
    ]);
    const browserTrack = JSON.parse(browserTrackOutput);
    setState({
      ...browserTrack,
      isSpotifyRunning: Utils.cleanupOutput(spotifyStatus) === "true",
    });
    setLoading(false);
  }, [visible]);

  useServerSocket("browser-track", visible, getBrowserTrack, resetWidget);
  useWidgetRefresh(visible, getBrowserTrack, refresh);

  if (loading) return <DataWidgetLoader.Widget className="browser-track" />;
  if (!state) return null;
  const { browser, title, isSpotifyRunning } = state;

  if (!browser?.length || !title?.length || isSpotifyRunning) return null;

  const Icon = () => {
    const BrowserIcon = getIcon(browser);
    return (
      <div className="browser-track__icons">
        <BrowserIcon />
        <Icons.Playing />
      </div>
    );
  };

  return (
    <DataWidget.Widget
      ref={ref}
      classes="browser-track"
      Icon={Icon}
      showSpecter={showSpecter}
    >
      {title}
    </DataWidget.Widget>
  );
});

Widget.displayName = "BrowserTrack";

function getIcon(browser) {
  if (browser === "chrome") return Icons.GoogleChrome;
  if (browser === "brave") return Icons.BraveBrowser;
  if (browser === "safari") return Icons.Safari;
  if (browser === "firefox") return Icons.Firefox;
  return Icons.Default;
}
