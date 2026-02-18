import Link from "next/link";
import MenuScene from "./menuScene";
import IconSlot from "../UI/iconSlot";

export default function Menu() {
    return (
        <div className="relative overflow-hidden h-screen text-center">
            {/* Garen animation background */}
            <MenuScene />

            <h1 className="absolute w-full top-0 left-1/2 -translate-x-1/2 
                           md:text-[60px] text-6xl font-bold"
            >DEMACIAN CRUSADE</h1>

            {/* Menu */}
            <div className="absolute md:w-[50vw] w-[95vw] bottom-10 left-1/2 -translate-x-1/2 ">
                <div className="flex flex-col gap-y-3">
                    <Link className="" href={"/map"}>
                        <div className="p-5 bg-blue-900 hover:bg-blue-800 border flex items-center justify-center gap-3">
                            <IconSlot
                                code="NG"
                                label="new game"
                                src="/icons/menu/menu_new_game.png"
                                className="h-8 w-8 border-blue-200/80 text-blue-100"
                            />
                            <span>New Game</span>
                        </div>
                    </Link>
                    <Link className="" href={"/map"}>
                        <div className="p-5 bg-blue-900 hover:bg-blue-800 border flex items-center justify-center gap-3">
                            <IconSlot
                                code="LD"
                                label="load game"
                                src="/icons/menu/menu_load_game.png"
                                className="h-8 w-8 border-blue-200/80 text-blue-100"
                            />
                            <span>Load Game</span>
                        </div>
                    </Link>
                </div>
                {/* Socials */}
                <div className="flex flex-row place-content-center mt-2 gap-x-2 ">
                    <div className="p-4 border md:w-[12%] w-[20%] aspect-square flex flex-col items-center justify-center gap-2">
                        <IconSlot code="GH" label="github" src="/icons/menu/menu_github.png" className="h-9 w-9 border-slate-200/80 text-slate-100" />
                        <span className="text-xs">Github</span>
                    </div>
                    <div className="p-4 border md:w-[12%] w-[20%] aspect-square flex flex-col items-center justify-center gap-2">
                        <IconSlot code="LI" label="linkedin" src="/icons/menu/menu_linkedin.png" className="h-9 w-9 border-slate-200/80 text-slate-100" />
                        <span className="text-xs">Linkedin</span>
                    </div>
                    <div className="p-4 border md:w-[12%] w-[20%] aspect-square flex flex-col items-center justify-center gap-2">
                        <IconSlot code="PF" label="portfolio" src="/icons/menu/menu_portfolio.png" className="h-9 w-9 border-slate-200/80 text-slate-100" />
                        <span className="text-xs">Portfolio</span>
                    </div>
                    <div className="p-4 border md:w-[12%] w-[20%] aspect-square flex flex-col items-center justify-center gap-2">
                        <IconSlot code="ML" label="mail" src="/icons/menu/menu_mail.png" className="h-9 w-9 border-slate-200/80 text-slate-100" />
                        <span className="text-xs">Mail</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
