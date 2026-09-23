import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import {
  getItemBlurbLocation,
  usableAbstractSnippet,
  type ItemBlurbLocation,
} from "../utils/itemBlurb";
import { openItemAtReaderLocation } from "../utils/items";

export function useMagazineBlurb(item: Zotero.Item, visible: boolean) {
  const abstractNote = useMemo(() => usableAbstractSnippet(item), [item]);
  const [blurb, setBlurb] = useState(abstractNote);
  const [location, setLocation] = useState<ItemBlurbLocation | null>(null);
  const [resolved, setResolved] = useState(Boolean(abstractNote));

  useEffect(() => {
    setBlurb(abstractNote);
    setLocation(null);
    setResolved(Boolean(abstractNote));
  }, [abstractNote]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    void getItemBlurbLocation(item).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.text) {
        setBlurb(result.text);
      }
      setLocation(result);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, item, abstractNote]);

  const open = (event: JSX.TargetedMouseEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (location) {
      openItemAtReaderLocation(item, location);
      return;
    }
    void getItemBlurbLocation(item).then((result) => {
      openItemAtReaderLocation(item, result);
    });
  };

  const onKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      open(event as unknown as JSX.TargetedMouseEvent<HTMLElement>);
    }
  };

  return { blurb, resolved, open, onKeyDown };
}
