import Main from "./components/Main";
import Header from "./components/Header";

export default function Home() {
  return (
    <main className="h-min-screen w-full justify-center flex">
      <div className="w-299 pt-12.5 gap-12.5 flex flex-col">
        <Header />
        <Main />
      </div>
    </main>
  );
}
