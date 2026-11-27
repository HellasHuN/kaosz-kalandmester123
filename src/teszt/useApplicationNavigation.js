import { useEffect, useRef } from "react";

const stateKey = "kaoszApplicationNavigation";

export function useApplicationNavigation({ snapshot, restore, confirmLeaving }) {
  const session = useRef(null);
  const position = useRef(0);
  const pending = useRef(false);
  const approved = useRef(false);
  const memory = useRef(new Map());
  const nextId = useRef(0);
  const current = useRef(null);
  const latest = useRef(null);

  function write(route, method) {
    window.history[method]({ ...window.history.state, [stateKey]: route }, "");
    current.current = route;
  }

  useEffect(() => {
    latest.current = { snapshot, restore, confirmLeaving };
    if (current.current && !pending.current) write({ ...current.current, snapshot }, "replaceState");
  });

  useEffect(() => {
    session.current = crypto.randomUUID();
    position.current = 0;
    write({ session: session.current, position: 0, id: 0, snapshot: latest.current.snapshot }, "replaceState");

    function onPop(event) {
      const route = event.state?.[stateKey];
      if (route?.session !== session.current) return;
      const previous = position.current;
      if (route.position === previous) {
        pending.current = false;
        return;
      }
      const allowed = approved.current || latest.current.confirmLeaving();
      approved.current = false;
      if (!allowed) {
        pending.current = true;
        window.history.go(previous - route.position);
        return;
      }
      pending.current = false;
      current.current = route;
      position.current = route.position;
      latest.current.restore(route.snapshot);
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function push(destination) {
    if (pending.current || !confirmLeaving()) return false;
    for (const id of memory.current.keys()) if (id > current.current.id) memory.current.delete(id);
    position.current += 1;
    write({
      session: session.current, position: position.current, id: ++nextId.current, snapshot: destination,
    }, "pushState");
    restore(destination);
    return true;
  }

  function back() {
    if (pending.current || position.current === 0) return;
    pending.current = true;
    window.history.back();
  }

  function home() {
    if (pending.current || position.current === 0 || !confirmLeaving()) return;
    pending.current = true;
    approved.current = true;
    window.history.go(-position.current);
  }

  const id = current.current?.id ?? 0;
  if (!memory.current.has(id)) memory.current.set(id, {});
  return { push, back, home, viewMemory: memory.current.get(id), viewId: id };
}

export function rememberViewValue(memory, key, setValue) {
  return value => {
    if (memory) memory[key] = value;
    setValue(value);
  };
}
