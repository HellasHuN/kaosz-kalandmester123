import { useEffect, useRef } from "react";
import "./applicationChrome.css";

export function ApplicationHeading({ children }) {
  return <header className="campaign-heading"><h2 className="character-section-title">{children}</h2></header>;
}

export function ApplicationDialog({ title, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="modal-panel campaign-dialog" aria-label={title}
    onCancel={event => event.preventDefault()}>
    <h2 className="character-section-title">{title}</h2>
    {children}
  </dialog>;
}
