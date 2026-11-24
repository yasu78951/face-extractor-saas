import './engine.css';
import './tool-ui.css';

export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return <div className="tool-route">{children}</div>;
}
