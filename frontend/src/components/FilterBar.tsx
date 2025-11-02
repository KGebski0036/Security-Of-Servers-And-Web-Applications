import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
}

const FilterBar = ({ tags, selectedTag, onTagSelect }: FilterBarProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filter by:</span>
      <Badge
        variant={selectedTag === null ? "default" : "secondary"}
        className="cursor-pointer transition-smooth"
        onClick={() => onTagSelect(null)}
      >
        All
      </Badge>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={selectedTag === tag ? "default" : "secondary"}
          className="cursor-pointer transition-smooth"
          onClick={() => onTagSelect(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
};

export default FilterBar;
