import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Icons from "@/components/archive/icons/index";
import { Icons as LucidIcons } from "@/components/archive/icons"
import { useGlobalState } from "@/states";
import {toast} from "sonner"
import { useState } from "react";
import { Combobox } from "../../ui/combo-box";
import { useProjectManager } from "@/hooks";
import { runLua, parseOutupt } from "@/lib/ao-vars";
import { ReloadIcon } from "@radix-ui/react-icons"

const rawBlueprintBase = "https://raw.githubusercontent.com/permaweb/aos/main/blueprints/"
const blueprints = [
    "apm.lua",
    "arena.lua",
    "arns.lua",
    "chat.lua",
    "chatroom.lua",
    "credUtils.lua",
    "staking.lua",
    "token.lua",
    "voting.lua"
]

export default function Blueprints() {
    const globalState = useGlobalState();
    const projectManager = useProjectManager();
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger onClick={(e) => {
            e.preventDefault();
            setCode("");
            // if (!globalState.activeProject) return toast({ title: "No active project", description: "You need to have an active project to use blueprints" });
            if (!globalState.activeProject) return toast.error("No active project", {description: "You need to have an active project to use blueprints",id:"error" });
            // if (globalState.activeMode != "AO") return toast({ title: "Not in AO mode", description: "Blueprints only work in AO" });
            if (globalState.activeMode != "AO") return toast.error("Not in AO mode", {description: "Blueprints only work in AO",id:"error" });
            const project = projectManager.getProject(globalState.activeProject);
            // if (!project) return toast({ title: "Project not found", description: "The active project was not found" });
            if (!project) return toast.error("Project not found", { description: "The active project was not found", id: "error" });
            // if (!project.process) return toast({ title: "Process id missing", description: "The active project doesnot seem to have a process id" });
            if (!project.process) return toast.error("Process id missing", { description: "The active project doesnot seem to have a process id", id: "error" });
            setOpen(true);
        }}>
            <div className="flex flex-col items-center justify-start opacity-50 hover:opacity-80 active:opacity-100">
                {/* <Image src={Icons.blueprintsSVG} alt="Blueprints" width={22} height={22} className="my-2" /> */}
                <LucidIcons.blueprints className="my-2 fill-foreground" />
                <div className="text-xs">BLUEPRINTS</div>
            </div>
        </DialogTrigger>
        <DialogContent className="max-w-[50vw]">
            <DialogHeader className="w-full">
                <DialogTitle>Load a Blueprint</DialogTitle>
                <DialogDescription>
                    Blueprints are pre-written code that you can use to get started quickly.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 items-center justify-center w-full">
                <Combobox
                    className=""
                    placeholder="Select a blueprint"
                    options={blueprints.map((bp) => ({ label: bp, value: bp }))}
                    onChange={async (val) => {
                        console.log(val);
                        const resp = await fetch(rawBlueprintBase + val);
                        const code = await resp.text();
                        setCode(code);
                    }}
                    onOpen={() => { }}
                />
                <pre className="w-full max-w-[46vw] text-xs h-[300px] overflow-scroll ring-1 ring-btr-grey-2 rounded-md p-1">
                    {code}
                </pre>
                <Button disabled={loading} onClick={async () => {
                    // if (!code) return toast({ title: "No code to load", description: "You need to select a blueprint to load" });
                    if (!code) return toast.error("No code to load", { description: "You need to select a blueprint to load", id: "error" });
                    setLoading(true);
                    const project = projectManager.getProject(globalState.activeProject);
                    const res = await runLua(code, project.process, [
                        { name: "BetterIDEa-Function", value: "load-Blueprint" }
                    ]);
                    console.log(res);
                    const output = parseOutupt(res);
                    console.log(output);
                    setLoading(false);
                    setOpen(false);
                }}>
                    {loading && <ReloadIcon className="animate-spin mr-2" />}
                    Load
                </Button>
            </div>
        </DialogContent>
    </Dialog>
}