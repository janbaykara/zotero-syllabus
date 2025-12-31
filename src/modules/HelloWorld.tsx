import { h } from "preact";

export function HelloWorld({ buttonProp }: { buttonProp: string }) {
  return (
    <div className="container-padding">
      <header>
        <h1 className="text-4xl font-bold">Reading Schedule</h1>
      </header>
      <button>{buttonProp}</button>
    </div>
  )
}