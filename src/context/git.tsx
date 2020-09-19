import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  GitgraphCore,
  GitgraphUserApi,
  Orientation,
  templateExtend,
  TemplateName,
  Commit,
} from "@gitgraph/core";

export type ReactSvgElement = React.ReactElement<SVGElement>;

export type CreateBranchModalData = {
  branchName: string;
  baseBranch: string;
  firstCommitMessage: string;
};

export type AddComitToBranchModalData = {
  commitMessage: string;
};

export type MergeBranchModalData = {
  branchToMergeName: string;
};

type GitState = {
  graph: GitgraphCore<ReactSvgElement>;
  graphAPI: GitgraphUserApi<ReactSvgElement>;
  selectedCommit: Commit<ReactSvgElement> | undefined;

  createBranch: (attrs: CreateBranchModalData) => void;
  createCommit: (attrs: AddComitToBranchModalData) => void;
  mergeBranch: (attrs: MergeBranchModalData) => void;
};

const GitContext = createContext<GitState | undefined>(undefined);

type GitProviderProps = {
  children: ReactNode;
};

const graphTemplate = templateExtend(TemplateName.Metro, {
  commit: {
    message: {
      displayAuthor: false,
      displayHash: false,
    },
  },
});

const graph = new GitgraphCore<ReactSvgElement>({
  branchLabelOnEveryCommit: true,
  author: "Samuel",
  orientation: Orientation.VerticalReverse,
  template: graphTemplate,
});

const handleChangeDotFillColor = (element: HTMLElement, color: string) => {
  element.style.fill = "white";
  element.style.stroke = "#4299E1";
  element.style.strokeWidth = "8px";
};

const resetElement = (element: HTMLElement, color: string) => {
  element.style.fill = color;
  element.style.strokeWidth = "0";
};

const getCommitElement = (
  hash: Commit<ReactSvgElement>["hash"]
): HTMLElement | null => {
  const elementId = hash;
  const element = document.getElementById(elementId);

  if (!element) return null;

  return element;
};

const GitProvider = ({ children }: GitProviderProps) => {
  const graphAPI = graph.getUserApi();
  const [selectedCommit, setSelectedCommit] = useState<
    Commit<ReactSvgElement> | undefined
  >();
  const [prevColor, setPrevColor] = useState<string | undefined>();
  const [_, setPrevHash] = useState<string | undefined>();

  useEffect(() => {
    graphAPI.branch("master").commit("feature/first commit message");
  }, []);

  useEffect(() => {
    if (!selectedCommit || !document) return;

    const element = getCommitElement(selectedCommit.hash);

    if (!element) return;

    const color = element.attributes.getNamedItem("fill")?.textContent;

    if (!color) return;

    setPrevHash((prev) => {
      if (prev && prevColor && selectedCommit.hash !== prev) {
        const prevElement = getCommitElement(prev);
        if (prevElement) resetElement(prevElement, prevColor);
      }

      return selectedCommit.hash;
    });

    setPrevColor(color);

    handleChangeDotFillColor(element, "red");
  }, [prevColor, selectedCommit]);

  const handleOnClick = (commit: Commit<ReactSvgElement>) => {
    setSelectedCommit(commit);
  };

  const createBranch = ({
    baseBranch,
    branchName,
    firstCommitMessage,
  }: CreateBranchModalData) => {
    if (!branchName || !firstCommitMessage) return;

    if (baseBranch) {
      const branch = graphAPI.branch(baseBranch).branch(branchName);

      branch.commit({
        subject: firstCommitMessage,
        onClick: handleOnClick,
      });
    } else {
      const branch = graphAPI.branch(branchName);

      branch.commit({
        subject: firstCommitMessage,
        onClick: handleOnClick,
        onMouseOver: (c) => {
          const element = getCommitElement(c.hash);
          if (!element) return;

          console.log(element);

          element.style.boxShadow = "0 2px 6px 0 rgba(0,0,0,0.1)";
        },
      });
    }
  };

  const createCommit = ({ commitMessage }: AddComitToBranchModalData) => {
    if (!selectedCommit || !commitMessage) return;
    if (!selectedCommit.branches) return;

    const branch = graph.branches.get(selectedCommit.branches[0]);

    if (!branch) return;

    branch.getUserApi().commit({
      subject: commitMessage,
      onClick: handleOnClick,
    });
  };

  const mergeBranch = ({ branchToMergeName }: MergeBranchModalData) => {
    if (!selectedCommit || !branchToMergeName) return;
    if (!selectedCommit.branches) return;

    const destinyBranch = graph.branches.get(branchToMergeName);
    const originBranch = graph.branches.get(selectedCommit.branches[0]);

    if (!destinyBranch || !originBranch) return;

    destinyBranch.getUserApi().merge({
      branch: originBranch.getUserApi().name,
      commitOptions: {
        onClick: handleOnClick,
      },
    });
  };

  return (
    <GitContext.Provider
      value={{
        graph,
        graphAPI,
        createBranch,
        selectedCommit,
        createCommit,
        mergeBranch,
      }}
    >
      {children}
    </GitContext.Provider>
  );
};

const useGitContext = () => {
  const context = useContext(GitContext);

  if (context === undefined) {
    throw new Error("useGitContext must be used within a GitProvider");
  }

  return context;
};

export { GitProvider, useGitContext };