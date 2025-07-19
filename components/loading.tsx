const Loading = () => {
  return (
    <div className="fixed top-0 left-0 z-50 flex h-full w-full items-center justify-center">
      <div className="h-32 w-32 animate-spin rounded-full border-gray-900 border-t-2 border-b-2"></div>
    </div>
  )
}

export default Loading
