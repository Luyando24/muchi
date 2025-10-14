import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header></Header>
      <main>{children}</main>
      <Footer></Footer>
    </div>
  );
}