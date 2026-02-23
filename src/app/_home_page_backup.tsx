"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, Globe, Menu as MenuIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { categories, products } from "@/data/mock-menu";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0].id);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll handler for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Simple scrollspy logic
      // In a real app, use IntersectionObserver for better performance
      for (const cat of categories) {
        const element = document.getElementById(cat.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveCategory(cat.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCategory = (catId: string) => {
    const element = document.getElementById(catId);
    if (element) {
      // Offset for the sticky header
      const y = element.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveCategory(catId);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 font-sans">
      {/* Top Navigation Bar */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white shadow-sm",
          isScrolled ? "py-2" : "py-4"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
              <MenuIcon className="h-6 w-6 text-foreground" />
            </Button>
            {/* Logo Text - Using Crowne Plaza Plum for Brand Identity */}
            <h1 className="text-xl font-bold tracking-tight text-primary">
              AURA
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Ara..."
                className="bg-zinc-100 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-48"
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
            </div>
            <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
              <Globe className="h-5 w-5 text-zinc-600" />
            </Button>
            <Button size="sm" className="bg-primary text-white hover:bg-primary/90 rounded-full px-6 font-medium">
              Giriş
            </Button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mt-2 border-t border-zinc-100">
          <div className="container mx-auto">
            <div className="flex overflow-x-auto py-3 px-4 gap-4 no-scrollbar items-center">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 min-w-[80px] group transition-all",
                    activeCategory === cat.id ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full overflow-hidden border-2 transition-all shadow-sm",
                      activeCategory === cat.id ? "border-primary ring-2 ring-primary/20" : "border-transparent group-hover:border-zinc-200"
                    )}
                  >
                    <Image
                      src={cat.image || ""}
                      alt={cat.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      activeCategory === cat.id ? "text-primary font-bold" : "text-zinc-600"
                    )}
                  >
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Spacer for Sticky Header */}
      <div className="h-[180px]" />

      {/* Hero / Banner Area */}
      <div className="container mx-auto px-4 mb-8">
        <div className="rounded-2xl bg-zinc-900 overflow-hidden relative h-48 md:h-64 shadow-lg">
          <Image
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2670&auto=format&fit=crop"
            alt="Restaurant Ambiance"
            fill
            className="object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 font-serif">Hoşgeldiniz</h2>
            <p className="text-zinc-200 max-w-lg">
              Özel lezzetlerimizi keşfedin. Siparişinizi buradan oluşturabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <main className="container mx-auto px-4 max-w-5xl">
        {categories.map((cat) => {
          const categoryProducts = products.filter(p => p.categoryId === cat.id);

          if (categoryProducts.length === 0) return null;

          return (
            <section key={cat.id} id={cat.id} className="mb-12 scroll-mt-[200px]">
              <div className="flex items-center gap-4 mb-6">
                <h3 className="text-2xl font-bold text-zinc-900">{cat.name}</h3>
                <div className="h-[1px] flex-1 bg-zinc-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-white rounded-xl p-4 border border-zinc-100 shadow-sm hover:shadow-md transition-all flex gap-4 cursor-pointer"
                  >
                    {/* Product Image */}
                    <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-zinc-100">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">
                          <MenuIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-lg text-zinc-900 leading-tight">
                            {product.name}
                          </h4>
                        </div>
                        <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Price Tag with Gold Accent */}
                        <span className="text-secondary font-bold text-lg">
                          {product.currency}{product.price}
                        </span>

                        <div className="flex gap-2">
                          {product.labels?.map((label) => (
                            <span key={label} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md">
                              {label}
                            </span>
                          ))}
                          <button className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>


    </div>
  );
}
