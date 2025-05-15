import { Group } from "./ChatPage";

interface GroupSelectorProps {
  groups: Group[];
  selectedGroup: Group | null;
  onGroupSelect: (group: Group) => void;
  onCreateGroup: () => void;
}

export default function GroupSelector({
  groups,
  selectedGroup,
  onGroupSelect,
  onCreateGroup,
}: GroupSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <h2 className="text-lg font-semibold">Groups</h2>
        <div className="flex mt-2 space-x-2 overflow-x-auto pb-2">
          {groups.map((group) => (
            <button
              key={group.id}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedGroup?.id === group.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => onGroupSelect(group)}
            >
              {group.groupname}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onCreateGroup}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        New Group
      </button>
    </div>
  );
}
