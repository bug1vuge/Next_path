import {Fragment} from "react";

/**
 * Words of a heading, each in its own mask, so the heading can rise word by
 * word when it comes into view (`[data-reveal="split"]` in `app/globals.css`).
 * Rendered on the server; the text stays one readable heading, with real
 * spaces between the words.
 */
export function SplitText({text}: {text: string}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={index}>
          {index > 0 ? " " : null}
          <span className="np-word">
            <span style={{"--w": index} as React.CSSProperties}>{word}</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}
