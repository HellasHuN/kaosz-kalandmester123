import { BookOpen, Droplets, Eye, Flame, Hourglass, Leaf, Moon, Mountain, Skull, Sparkles, Wind } from "lucide-react";

const codexIcons = {
  Alabástrom: Wind,
  Arany: Eye,
  Azúr: Droplets,
  Ezüst: Hourglass,
  Fekete: Skull,
  Gránit: Mountain,
  Kígyókő: Moon,
  Kódexfüggetlen: Sparkles,
  Skarlát: Flame,
  Smaragd: Leaf,
};

export function getCodexIcon(codex) {
  return Object.hasOwn(codexIcons, codex) ? codexIcons[codex] : BookOpen;
}
