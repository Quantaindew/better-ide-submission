import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Icons from "@/assets/icons";
import { useGlobalState } from "@/states";
import { toast } from "../ui/use-toast";
import { useState } from "react";
import { Combobox } from "../ui/combo-box";
import { useProjectManager } from "@/hooks";
import { runLua, parseOutupt } from "@/lib/ao-vars";
import { ReloadIcon } from "@radix-ui/react-icons"

import { source as graphSource } from "@/modules/ao/graph";
import { CopyIcon } from "lucide-react";

const modules = [
    "graph.lua"
]

export default function Share() {
    const globalState = useGlobalState();
    const projectManager = useProjectManager();
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [sharing, setSharing] = useState(false);
    const [shared, setShared] = useState(false);

    async function shareProject() {
        if (!globalState.activeProject) return toast({ title: "No active project", description: "You need to have an active project to share" });
        if (globalState.activeMode != "AO") return toast({ title: "Not in AO mode", description: "Sharing only works in AO" });
        const project = projectManager.getProject(globalState.activeProject);
        if (!project) return toast({ title: "Project not found", description: "The active project was not found" });
        if (!project.process) return toast({ title: "Process id missing", description: "The active project doesnot seem to have a process id" });
        const ownerAddress = project.ownerWallet;
        const activeAddress = await window.arweaveWallet.getActiveAddress();
        const shortAddress = ownerAddress.slice(0, 5) + "..." + ownerAddress.slice(-5);
        if (ownerAddress != activeAddress) return toast({ title: "The owner wallet for this project is differnet", description: `It was created with ${shortAddress}.\nSome things might be broken` })
        const processBackup = project.process
        delete project.ownerWallet
        delete project.process

        setShared(false);

        // const stringProj = JSON.stringify(project, null, 2).replaceAll("\\n","")
        const urlEncodedJson = encodeURIComponent(JSON.stringify(project)).replaceAll("'", "\\'")

        const luaToRun = `_BETTERIDEA_SHARE = '${urlEncodedJson}'

    Handlers.add(
      "Get-Better-IDEa-Share",
      Handlers.utils.hasMatchingTag("Action","Get-BetterIDEa-Share"),
      function(msg)
        ao.send({Target=msg.From, Action="BetterIDEa-Share-Response", Data=_BETTERIDEA_SHARE})
        return _BETTERIDEA_SHARE
      end
    )   
    `
        console.log(luaToRun)
        setSharing(true);
        const res = await runLua(luaToRun, processBackup, [
            { name: "BetterIDEa-Function", value: "Share-Project" }
        ]);
        console.log(res)

        if (res.Error) {
            setSharing(false);
            setShared(false);
            return toast({ title: "Error sharing project", description: res.Error });
        }

        const url = `${window.location.origin}/import?id=${processBackup}`;
        setUrl(url);
        setSharing(false);
        setShared(true);
    }

    const p = projectManager.getProject(globalState.activeProject);
    const shortProcess = p.process ? p.process.slice(0, 5) + "..." + p.process.slice(-5) : "";

    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger onClick={(e) => {
            e.preventDefault();
            setUrl("");
            setShared(false);
            setSharing(false);
            if (!globalState.activeProject) return toast({ title: "No active project", description: "You need to have an active project to use Modules" });
            if (globalState.activeMode != "AO") return toast({ title: "Not in AO mode", description: "Modules only work in AO" });
            const project = projectManager.getProject(globalState.activeProject);
            if (!project) return toast({ title: "Project not found", description: "The active project was not found" });
            if (!project.process) return toast({ title: "Process id missing", description: "The active project doesnot seem to have a process id" });
            setOpen(true);
        }}>
            <Button variant="ghost" className="p-2 h-10 flex-col">
                <Image src={sharing ? Icons.loadingSVG : Icons.sendSVG} alt="Send" width={20} height={20} className={`${sharing && "animate-spin bg-black rounded-full"}`} />
                <div className="text-[12px]">SHARE</div>
            </Button>
        </DialogTrigger>
        <DialogContent className="w-screen">
            <DialogHeader>
                <DialogTitle>Share this Project</DialogTitle>
                <DialogDescription>
                    Sharing this project will create a variable <span className="font-btr-mono">_BETTERIDEA_SHARE</span> containing the project data inside your process along with a url which you can share.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 items-center justify-center">
                {!shared && <Button disabled={sharing} onClick={shareProject}>
                    {sharing && <ReloadIcon className="animate-spin mr-2" />}
                    Share
                </Button>}
                {shared && <Button onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast({ title: "Project URL copied", description: "The URL to the project has been copied to your clipboard" });
                }}>
                    https://ide.betteridea.dev/import?id={shortProcess}
                    <CopyIcon className="ml-2" />
                </Button>}
            </div>
        </DialogContent>
    </Dialog>
}