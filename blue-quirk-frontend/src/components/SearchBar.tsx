import { Search } from "lucide-react";

export default function SearchBar() {
  return (

    <div className="overflow-hidden flex relative p-0.5 rounded-full bg-blue-400
    focus-within:bg-gradient-to-r
        focus-within:from-blue-500
        focus-within:via-purple-500
        focus-within:to-pink-500
    ">
        <div className="swep"></div>
        <div className="relative w-full flex items-center rounded-full h-12 z-4 bg-white">

          <input
            type="text"
            placeholder="Search..."
            className="
              w-full
              h-full
              bg-transparent
              px-4
              text-sm
              text-gray-700
              outline-none
            "
          />

          <Search className="absolute right-4 h-5 w-5 text-black" />
        </div>
    </div>
  );
}