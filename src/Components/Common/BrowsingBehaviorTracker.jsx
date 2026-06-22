import useBrowsingBehaviorTracker from "../../hooks/useBrowsingBehaviorTracker";

/** Invisible global tracker — mounts once inside the app shell. */
export default function BrowsingBehaviorTracker() {
  useBrowsingBehaviorTracker();
  return null;
}
