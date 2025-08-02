import ThemeToggle from "./themeToggle"

export const Header: React.FC = () => {
    return (
        <header className="sticky top-0 z-50 flex justify-between bg-[rgba(237,237,237,0.95)] dark:bg-[rgba(18,18,18,0.95)] px-4 py-4 shadow-md">
        <h1 className="text-3xl font-extrabold text-[#00bfff]">
          Sosika
        </h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>
    );
}