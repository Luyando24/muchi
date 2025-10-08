import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ShoppingCart,
  Store,
  Search as SearchIcon,
  Pill,
  Syringe,
  Baby,
  ShieldCheck,
} from "lucide-react";
import TopNav from "@/components/navigation/TopNav";

interface Product {
  id: string;
  name: string;
  price: number;
  category:
    | "Antibiotics"
    | "Pain Relief"
    | "Vitamins"
    | "Maternal & Child"
    | "Devices";
  rx: boolean;
  stock: number;
  description: string;
}

const PRODUCTS: Product[] = [
  {
    id: "amox",
    name: "Amoxicillin 500mg (10 caps)",
    price: 35,
    category: "Antibiotics",
    rx: true,
    stock: 42,
    description: "Broad‑spectrum antibiotic for bacterial infections.",
  },
  {
    id: "paracetamol",
    name: "Paracetamol 500mg (20 tabs)",
    price: 18,
    category: "Pain Relief",
    rx: false,
    stock: 120,
    description: "Pain and fever reducer.",
  },
  {
    id: "prenatal",
    name: "Prenatal vitamins (30 tabs)",
    price: 55,
    category: "Maternal & Child",
    rx: false,
    stock: 60,
    description:
      "Folic acid, iron, and essential micronutrients for pregnancy.",
  },
  {
    id: "ors",
    name: "ORS sachets (10)",
    price: 22,
    category: "Maternal & Child",
    rx: false,
    stock: 90,
    description: "Oral rehydration solution for dehydration.",
  },
  {
    id: "glucometer",
    name: "Glucometer Strips (50)",
    price: 210,
    category: "Devices",
    rx: false,
    stock: 25,
    description: "Blood glucose test strips.",
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen 400mg (20 tabs)",
    price: 24,
    category: "Pain Relief",
    rx: false,
    stock: 80,
    description: "NSAID for pain and inflammation.",
  },
  {
    id: "vitc",
    name: "Vitamin C 1000mg (20 tabs)",
    price: 30,
    category: "Vitamins",
    rx: false,
    stock: 150,
    description: "Immune support.",
  },
];

export default function Pharmacy() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, number>>({});

  const categories = [
    "All",
    ...Array.from(new Set(PRODUCTS.map((p) => p.category))),
  ];

  const filtered = useMemo(() => {
    return PRODUCTS.filter(
      (p) =>
        (category === "All" || p.category === (category as any)) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query, category]);

  const total = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find((x) => x.id === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const add = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => ({ ...c, [id]: Math.max((c[id] || 0) - 1, 0) }));
  const remove = (id: string) =>
    setCart((c) => {
      const n = { ...c };
      delete n[id];
      return n;
    });

  return (
    <div className="pb-16 md:pb-0">
      <TopNav
        brand="Digital Pharmacy"
        items={[
          { to: "/pharmacy", label: "Shop" },
          { to: "/login", label: "Seller Login" },
          { to: "/register", label: "Become a Seller" },
        ]}
      />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Shop Medicines</h1>
            <p className="text-sm text-muted-foreground">
              Order over‑the‑counter and prescription medicines from trusted
              pharmacies.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-64"
                placeholder="Search medicines"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart ({Object.values(cart).reduce((a, b) => a + b, 0)})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Your Cart</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  {Object.keys(cart).length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No items yet.
                    </div>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const p = PRODUCTS.find((x) => x.id === id)!;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 border-b pb-2"
                        >
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ZMW {p.price.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => dec(id)}
                            >
                              -
                            </Button>
                            <div className="w-6 text-center">{qty}</div>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => add(id)}
                            >
                              +
                            </Button>
                            <Button variant="ghost" onClick={() => remove(id)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm">Total</div>
                  <div className="text-lg font-semibold">
                    ZMW {total.toFixed(2)}
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full">Checkout</Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Prescriptions may be verified for RX items.
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              variant={c === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{p.name}</span>
                  {p.rx ? (
                    <Badge variant="secondary" className="ml-2">
                      RX
                    </Badge>
                  ) : (
                    <Badge className="ml-2">OTC</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground min-h-10">
                  {p.description}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">
                    ZMW {p.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    In stock: {p.stock}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => add(p.id)} className="flex-1">
                    <ShoppingCart className="h-4 w-4 mr-1" /> Add
                  </Button>
                  <Button asChild variant="outline">
                    <a href="#">Details</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sell with Flova</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Certified pharmacies can list products, manage inventory, and
              receive orders directly.
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/register">
                  <Store className="h-4 w-4 mr-1" /> Become a Seller
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Seller Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
