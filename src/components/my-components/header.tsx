import ThemeToggle from "./themeToggle"

export const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-50 flex justify-between bg-white dark:bg-[#2b2b2b] px-4 py-4 shadow-md">
        <h1 className="text-3xl font-extrabold text-[#00bfff]">
          Sosika<span className="text-[12px] font-medium text-green-400"> BETA</span>
        </h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>
    );
}