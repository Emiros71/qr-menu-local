export type Category = {
    id: string;
    name: string;
    slug: string;
    image?: string;
};

export type Product = {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    image?: string;
    labels?: string[]; // e.g. ["New", "Spicy", "Vegetarian"]
};

export const categories: Category[] = [
    {
        id: "cat_1",
        name: "Kahvaltı",
        slug: "kahvalti",
        image: "https://images.unsplash.com/photo-1533089862017-5614ec42e716?q=80&w=2670&auto=format&fit=crop",
    },
    {
        id: "cat_2",
        name: "Başlangıçlar",
        slug: "baslangiclar",
        image: "https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=2670&auto=format&fit=crop",
    },
    {
        id: "cat_3",
        name: "Ana Yemekler",
        slug: "ana-yemekler",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2670&auto=format&fit=crop",
    },
    {
        id: "cat_4",
        name: "Salatalar",
        slug: "salatalar",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2670&auto=format&fit=crop",
    },
    {
        id: "cat_5",
        name: "Tatlılar",
        slug: "tatlilar",
        image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=2574&auto=format&fit=crop",
    },
    {
        id: "cat_6",
        name: "İçecekler",
        slug: "icecekler",
        image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=2574&auto=format&fit=crop",
    },
];

export const products: Product[] = [
    // Kahvaltı
    {
        id: "p_1",
        categoryId: "cat_1",
        name: "Serpme Kahvaltı (2 Kişilik)",
        description: "Beyaz peynir, kaşar peyniri, tulum peyniri, siyah ve yeşil zeytin, bal, kaymak, tereyağı, reçel çeşitleri, domates, salatalık, biber, sahanda yumurta, sigara böreği, sınırsız çay.",
        price: 850,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1533089862017-5614ec42e716?q=80&w=2670&auto=format&fit=crop",
        labels: ["Popüler"],
    },
    {
        id: "p_2",
        categoryId: "cat_1",
        name: "Menemen",
        description: "Organik domates, biber ve köy yumurtası ile hazırlanan geleneksel lezzet.",
        price: 180,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1593584785033-9c7604d0863f?q=80&w=2581&auto=format&fit=crop",
    },

    // Başlangıçlar
    {
        id: "p_3",
        categoryId: "cat_2",
        name: "Bruschetta Trio",
        description: "Kızarmış ekşi mayalı ekmek üzerinde domatesli, mantarlı ve avokadolu üç farklı lezzet.",
        price: 240,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1572695157363-bc31c5dd3386?q=80&w=2670&auto=format&fit=crop",
        labels: ["Vejetaryen"],
    },
    {
        id: "p_4",
        categoryId: "cat_2",
        name: "Dana Carpaccio",
        description: "İnce dilimlenmiş bonfile, roka, parmesan peyniri ve trüf yağı ile.",
        price: 420,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=2670&auto=format&fit=crop",
    },

    // Ana Yemekler
    {
        id: "p_5",
        categoryId: "cat_3",
        name: "Izgara Antrikot",
        description: "250g dinlendirilmiş antrikot, patates püresi ve sote sebzeler eşliğinde.",
        price: 950,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1546241072-48010ad2862c?q=80&w=2574&auto=format&fit=crop",
        labels: ["Şefin Tavsiyesi"],
    },
    {
        id: "p_6",
        categoryId: "cat_3",
        name: "Somon Izgara",
        description: "Norveç somonu, kinoa salatası ve limonlu tereyağı sosu ile.",
        price: 780,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?q=80&w=2574&auto=format&fit=crop",
    },
    {
        id: "p_7",
        categoryId: "cat_3",
        name: "Mantarlı Risotto",
        description: "Arborio pirinci, porçini mantarı, parmesan ve trüf aroması.",
        price: 520,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=2670&auto=format&fit=crop",
        labels: ["Glutensiz"],
    },

    // Salatalar
    {
        id: "p_8",
        categoryId: "cat_4",
        name: "Sezar Salata",
        description: "Marul, kruton, parmesan peyniri ve özel sezar sos.",
        price: 380,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?q=80&w=2670&auto=format&fit=crop",
    },
    {
        id: "p_9",
        categoryId: "cat_4",
        name: "Kinoa & Avokado",
        description: "Taze yeşillikler, kinoa, avokado, cherry domates ve nar ekşisi sosu.",
        price: 410,
        currency: "₺",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=2670&auto=format&fit=crop",
        labels: ["Vegan"],
    },
];
