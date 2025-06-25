import Link from "next/link";
import MenuScene from "./menuScene";

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
                    <Link className="" href={"/combat"}>
                        <div className="p-5 bg-blue-900 hover:bg-blue-800 border">New Game</div>
                    </Link>
                    <Link className="" href={"/combat"}>
                        <div className="p-5 bg-blue-900 hover:bg-blue-800 border">Load Game</div>
                    </Link>
                </div>
                {/* Socials */}
                <div className="flex flex-row place-content-center mt-2 gap-x-2 ">
                    <div className="p-7 border md:w-[12%] w-[20%] aspect-square">Github</div>
                    <div className="p-7 border md:w-[12%] w-[20%] aspect-square">Linkedin</div>
                    <div className="p-7 border md:w-[12%] w-[20%] aspect-square">Portfolio</div>
                    <div className="p-7 border md:w-[12%] w-[20%] aspect-square">Mail</div>
                </div>
            </div>
        </div>
    )
}