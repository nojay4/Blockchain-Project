"use client";

import Link from "next/link";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Menu, Trophy, LayoutList } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
  /** When true, dropdown is not openable (e.g. Leagues until a sport is selected). */
  disabled?: boolean;
}

export interface Navbar1Props {
  logo?: {
    url: string;
    src?: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
  mobileExtraLinks?: { name: string; url: string }[];
  auth?: {
    login: { text: string; url: string };
    signup: { text: string; url: string };
  };
  /** When set, replaces placeholder Log in / Sign up with this slot (e.g. web3 connect). */
  walletSlot?: React.ReactNode;
}

const defaultLogo = {
  url: "/",
  alt: "CU SportsBetting",
  title: "CU SportsBetting",
};

const defaultMenu: MenuItem[] = [
  { title: "Home", url: "/" },
  {
    title: "Sports",
    url: "#",
    items: [
      {
        title: "Football",
        description: "NFL, college football",
        icon: <Trophy className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Basketball",
        description: "NBA, NCAA",
        icon: <Trophy className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "Soccer",
        description: "MLS, international",
        icon: <Trophy className="size-5 shrink-0" />,
        url: "#",
      },
    ],
  },
  {
    title: "Leagues",
    url: "#",
    items: [
      {
        title: "NFL",
        description: "National Football League",
        icon: <LayoutList className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "NBA",
        description: "National Basketball Association",
        icon: <LayoutList className="size-5 shrink-0" />,
        url: "#",
      },
      {
        title: "MLB",
        description: "Major League Baseball",
        icon: <LayoutList className="size-5 shrink-0" />,
        url: "#",
      },
    ],
  },
];

const defaultAuth = {
  login: { text: "Log in", url: "#" },
  signup: { text: "Sign up", url: "#" },
};

const defaultMobileExtraLinks = [
  { name: "Press", url: "#" },
  { name: "Contact", url: "#" },
];

function Logo({ logo }: { logo: NonNullable<Navbar1Props["logo"]> }) {
  const content = (
    <>
      {logo.src ? (
        <img src={logo.src} className="w-8" alt={logo.alt} />
      ) : null}
      <span className="text-lg font-semibold">{logo.title}</span>
    </>
  );
  return (
    <Link
      href={logo.url}
      className="flex items-center gap-2 font-serif text-foreground"
    >
      {content}
    </Link>
  );
}

function renderMenuItem(item: MenuItem) {
  if (item.items) {
    if (item.disabled) {
      return (
        <NavigationMenuItem key={item.title} className="text-muted-foreground">
          <span
            className="group inline-flex h-9 w-max cursor-not-allowed items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium opacity-50"
            aria-disabled="true"
          >
            {item.title}{" "}
            <ChevronDownIcon
              className="relative top-[1px] ml-1 h-3 w-3"
              aria-hidden="true"
            />
          </span>
        </NavigationMenuItem>
      );
    }
    return (
      <NavigationMenuItem key={item.title} className="text-muted-foreground">
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul className="w-80 max-h-64 overflow-y-auto p-3">
            {item.items.map((subItem) => (
              <li key={subItem.title}>
                <Link
                  className="flex select-none gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
                  href={subItem.url}
                >
                  {subItem.icon}
                  <div>
                    <div className="text-sm font-semibold">{subItem.title}</div>
                    {subItem.description && (
                      <p className="text-sm leading-snug text-muted-foreground">
                        {subItem.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink asChild>
        <Link
          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
          href={item.url}
        >
          {item.title}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

function renderMobileMenuItem(item: MenuItem) {
  if (item.items) {
    if (item.disabled) {
      return (
        <AccordionItem key={item.title} value={item.title} className="border-b-0">
          <span className="flex py-4 font-semibold opacity-50" aria-disabled="true">
            {item.title}
          </span>
        </AccordionItem>
      );
    }
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2 max-h-64 overflow-y-auto">
          {item.items.map((subItem) => (
            <Link
              key={subItem.title}
              className="flex select-none gap-4 rounded-md p-3 leading-none outline-none transition-colors hover:bg-muted hover:text-accent-foreground"
              href={subItem.url}
            >
              {subItem.icon}
              <div>
                <div className="text-sm font-semibold">{subItem.title}</div>
                {subItem.description && (
                  <p className="text-sm leading-snug text-muted-foreground">
                    {subItem.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <AccordionItem key={item.title} value={item.title} className="border-b-0">
      <Link
        href={item.url}
        className="flex flex-1 items-center py-4 font-semibold hover:underline"
      >
        {item.title}
      </Link>
    </AccordionItem>
  );
}

export function Navbar1({
  logo = defaultLogo,
  menu = defaultMenu,
  mobileExtraLinks = defaultMobileExtraLinks,
  auth = defaultAuth,
  walletSlot,
}: Navbar1Props) {
  return (
    <section className="py-4">
      <div className="container mx-auto max-w-5xl px-4">
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Logo logo={logo} />
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {walletSlot}
            <ThemeToggle />
            {!walletSlot && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={auth.login.url}>{auth.login.text}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={auth.signup.url}>{auth.signup.text}</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Logo logo={logo} />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Logo logo={logo} />
                  </SheetTitle>
                </SheetHeader>
                <div className="my-6 flex flex-col gap-6">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>
                  <div className="border-t py-4">
                    <div className="grid grid-cols-2 justify-start">
                      {mobileExtraLinks.map((link, idx) => (
                        <Link
                          key={idx}
                          className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-accent-foreground"
                          href={link.url}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {walletSlot}
                    <ThemeToggle />
                    {!walletSlot && (
                      <>
                        <Button asChild variant="outline">
                          <Link href={auth.login.url}>{auth.login.text}</Link>
                        </Button>
                        <Button asChild>
                          <Link href={auth.signup.url}>{auth.signup.text}</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
}
